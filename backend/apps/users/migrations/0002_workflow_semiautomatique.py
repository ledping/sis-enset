# Generated manually for SIS ENSET semi-automatic workflow
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='MatriculeEtudiantAutorise',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('matricule', models.CharField(max_length=80, unique=True)),
                ('nom', models.CharField(max_length=120)),
                ('prenom', models.CharField(blank=True, max_length=120)),
                ('email', models.EmailField(blank=True, max_length=254)),
                ('departement', models.CharField(default='Genie Informatique', max_length=100)),
                ('filiere', models.CharField(blank=True, max_length=100)),
                ('niveau', models.IntegerField(blank=True, null=True)),
                ('telephone', models.CharField(blank=True, max_length=20)),
                ('consomme', models.BooleanField(default=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
            ],
            options={
                'verbose_name': 'Matricule étudiant autorisé',
                'verbose_name_plural': 'Matricules étudiants autorisés',
                'ordering': ['matricule'],
            },
        ),
        migrations.CreateModel(
            name='ParametresValidation',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('publication_auto_cours', models.BooleanField(default=True)),
                ('publication_auto_td', models.BooleanField(default=True)),
                ('publication_auto_tp', models.BooleanField(default=True)),
                ('publication_auto_support', models.BooleanField(default=True)),
                ('validation_obligatoire_examens', models.BooleanField(default=True)),
                ('validation_obligatoire_corriges', models.BooleanField(default=True)),
                ('prevalidation_auto_memoires', models.BooleanField(default=True)),
                ('auto_activation_etudiants', models.BooleanField(default=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'verbose_name': 'Paramètres de validation',
                'verbose_name_plural': 'Paramètres de validation',
            },
        ),
    ]
